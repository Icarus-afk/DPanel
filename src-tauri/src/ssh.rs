use crate::types::*;
use ssh2::Session;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::io::Read;
use std::path::Path;

pub struct SshClient {
    config: ServerProfile,
    session: Arc<Mutex<Option<Session>>>,
}

impl SshClient {
    pub fn new(config: ServerProfile) -> Self {
        SshClient {
            config,
            session: Arc::new(Mutex::new(None)),
        }
    }

    fn expand_tilde(path: &str) -> String {
        if path.starts_with("~/") {
            if let Ok(home) = std::env::var("HOME") {
                return format!("{}/{}", home, &path[2..]);
            }
        }
        path.to_string()
    }

    pub fn connect(&self) -> Result<(), CommandError> {
        let tcp = TcpStream::connect(format!("{}:{}", self.config.host, self.config.port))
            .map_err(|e| CommandError {
                message: format!("Failed to connect to {}:{}: {}", self.config.host, self.config.port, e),
                code: -1,
            })?;

        let mut session = Session::new().map_err(|e| CommandError {
            message: format!("Failed to create SSH session: {}", e),
            code: -1,
        })?;
        
        session.set_tcp_stream(tcp);
        
        // Use blocking mode for simplicity
        session.set_blocking(true);

        // Handshake
        session.handshake().map_err(|e| CommandError {
            message: format!("SSH handshake failed: {}", e),
            code: -1,
        })?;

        // Authenticate based on auth method
        match &self.config.auth_method {
            AuthMethod::Password { password } => {
                session.userauth_password(&self.config.username, password)
                    .map_err(|e| CommandError {
                        message: format!("Password authentication failed: {}", e),
                        code: -1,
                    })?;
            }
            AuthMethod::PrivateKey { key_path, passphrase } => {
                let expanded_path = Self::expand_tilde(key_path);
                let path_ref = Path::new(&expanded_path);
                
                if let Some(pass) = passphrase {
                    session.userauth_pubkey_file(&self.config.username, None, path_ref, Some(pass))
                        .map_err(|e| CommandError {
                            message: format!("Key authentication failed: {}", e),
                            code: -1,
                        })?;
                } else {
                    session.userauth_pubkey_file(&self.config.username, None, path_ref, None)
                        .map_err(|e| CommandError {
                            message: format!("Key authentication failed: {}", e),
                            code: -1,
                        })?;
                }
            }
        }

        // Verify authentication succeeded
        if !session.authenticated() {
            return Err(CommandError {
                message: "SSH authentication failed".to_string(),
                code: -1,
            });
        }

        let mut session_guard = self.session.lock().unwrap();
        *session_guard = Some(session);

        Ok(())
    }

    pub fn disconnect(&self) {
        let mut session_guard = self.session.lock().unwrap();
        if let Some(_session) = session_guard.take() {
            // Session will be dropped and connection closed automatically
            // The ssh2 library handles cleanup on drop
        }
    }

    pub fn execute_command(&self, command: &str) -> Result<String, CommandError> {
        let session_guard = self.session.lock().unwrap();
        let session = session_guard.as_ref().ok_or_else(|| CommandError {
            message: "Not connected".to_string(),
            code: -1,
        })?;

        let mut channel = session.channel_session().map_err(|e| CommandError {
            message: format!("Failed to open channel: {}", e),
            code: -1,
        })?;

        channel.exec(command).map_err(|e| CommandError {
            message: format!("Failed to execute command: {}", e),
            code: -1,
        })?;

        let mut output = String::new();
        let stderr = String::new();
        
        // Read stdout
        channel.read_to_string(&mut output).map_err(|e| CommandError {
            message: format!("Failed to read output: {}", e),
            code: -1,
        })?;

        channel.wait_close().map_err(|e| CommandError {
            message: format!("Failed to wait for channel close: {}", e),
            code: -1,
        })?;

        let exit_status = channel.exit_status().map_err(|e| CommandError {
            message: format!("Failed to get exit status: {}", e),
            code: -1,
        })?;

        // Return output even if exit status is non-zero (common with fallbacks)
        // Only error if we have stderr and no stdout
        if output.is_empty() && !stderr.is_empty() {
            Err(CommandError {
                message: stderr,
                code: exit_status,
            })
        } else {
            Ok(output)
        }
    }

    pub fn is_connected(&self) -> bool {
        let session_guard = self.session.lock().unwrap();
        session_guard.as_ref().map_or(false, |s| s.authenticated())
    }

    pub fn get_host(&self) -> String {
        self.config.host.clone()
    }
}
