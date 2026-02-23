use crate::ssh::SshClient;
use crate::types::*;
use crate::commands::AppState;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_system_users(state: State<'_, AppState>) -> Result<Vec<SystemUser>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;

    let passwd_output = client.execute_command("cat /etc/passwd").map_err(|e| e.message)?;
    let locked_output = client.execute_command("sudo awk -F: '/^!/ || /^\\*/ || /!\\*/ || /!!/ {print $1}' /etc/shadow 2>/dev/null || echo ''").unwrap_or_default();
    let passwd_users_output = client.execute_command("sudo awk -F: '($2 != \"x\" && $2 != \"!\" && $2 != \"*\" && $2 != \"!!\") {print $1}' /etc/shadow 2>/dev/null || echo ''").unwrap_or_default();

    let locked_users: std::collections::HashSet<String> = locked_output.lines().map(|s| s.trim().to_string()).collect();
    let users_with_password: std::collections::HashSet<String> = passwd_users_output.lines().map(|s| s.trim().to_string()).collect();

    let mut users = Vec::new();
    for line in passwd_output.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 7 {
            let username = parts[0].to_string();
            let uid: u32 = parts[2].parse().unwrap_or(0);
            if uid < 1000 && uid != 0 { continue; }

            let gid: u32 = parts[3].parse().unwrap_or(0);
            let gecos = parts[4].to_string();
            let home = parts[5].to_string();
            let shell = parts[6].to_string();

            let groups_output = client.execute_command(&format!("id -Gn {} 2>/dev/null", username)).unwrap_or_default();
            let groups: Vec<String> = groups_output.trim().split_whitespace().map(|s| s.to_string()).collect();

            let last_login_output = client.execute_command(&format!("lastlog -u {} 2>/dev/null | tail -1 | awk '{{print $4, $5, $6, $7}}'", username)).unwrap_or_default();
            let last_login = if last_login_output.trim().is_empty() || last_login_output.contains("Never") { None } else { Some(last_login_output.trim().to_string()) };

            users.push(SystemUser { username: username.clone(), uid, gid, groups, home, shell, gecos, locked: locked_users.contains(&username), has_password: users_with_password.contains(&username), last_login });
        }
    }
    users.sort_by(|a, b| a.username.cmp(&b.username));
    Ok(users)
}

#[tauri::command]
pub async fn get_system_groups(state: State<'_, AppState>) -> Result<Vec<SystemGroup>, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    let group_output = client.execute_command("cat /etc/group").map_err(|e| e.message)?;
    let mut groups = Vec::new();
    for line in group_output.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 4 {
            let name = parts[0].to_string();
            let gid: u32 = parts[2].parse().unwrap_or(0);
            let members: Vec<String> = if !parts[3].is_empty() { parts[3].split(',').map(|s| s.to_string()).collect() } else { Vec::new() };
            groups.push(SystemGroup { name, gid, members });
        }
    }
    groups.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(groups)
}

#[tauri::command]
pub async fn create_user(request: CreateUserRequest, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    let mut cmd = String::from("sudo useradd");
    if request.create_home { cmd.push_str(" -m"); }
    if let Some(home) = &request.home { cmd.push_str(&format!(" -d {}", home)); }
    if let Some(shell) = &request.shell { cmd.push_str(&format!(" -s {}", shell)); }
    if !request.groups.is_empty() { cmd.push_str(&format!(" -G {}", request.groups.join(","))); }
    cmd.push_str(&format!(" {}", request.username));
    client.execute_command(&cmd).map_err(|e| e.message)?;
    if let Some(password) = &request.password {
        client.execute_command(&format!("echo '{}:{}' | sudo chpasswd", request.username, password)).map_err(|e| e.message)?;
    }
    Ok(format!("User '{}' created successfully", request.username))
}

#[tauri::command]
pub async fn delete_user(username: String, remove_home: bool, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    if username == "root" || username == "admin" || username.is_empty() { return Err("Cannot delete protected user".to_string()); }
    let cmd = if remove_home { format!("sudo userdel -r {}", username) } else { format!("sudo userdel {}", username) };
    client.execute_command(&cmd).map_err(|e| e.message)?;
    Ok(format!("User '{}' deleted successfully", username))
}

#[tauri::command]
pub async fn lock_user(username: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("sudo usermod -L {}", username)).map_err(|e| e.message)?;
    Ok(format!("User '{}' locked", username))
}

#[tauri::command]
pub async fn unlock_user(username: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("sudo usermod -U {}", username)).map_err(|e| e.message)?;
    Ok(format!("User '{}' unlocked", username))
}

#[tauri::command]
pub async fn set_user_password(username: String, new_password: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("echo '{}:{}' | sudo chpasswd", username, new_password)).map_err(|e| e.message)?;
    Ok(format!("Password updated for user '{}'", username))
}

#[tauri::command]
pub async fn add_user_to_group(username: String, group: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("sudo usermod -aG {} {}", group, username)).map_err(|e| e.message)?;
    Ok(format!("User '{}' added to group '{}'", username, group))
}

#[tauri::command]
pub async fn remove_user_from_group(username: String, group: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("sudo gpasswd -d {} {}", username, group)).map_err(|e| e.message)?;
    Ok(format!("User '{}' removed from group '{}'", username, group))
}

#[tauri::command]
pub async fn add_ssh_key(username: String, key: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    let home_output = client.execute_command(&format!("getent passwd {} | cut -d: -f6", username)).map_err(|e| e.message)?;
    let home = home_output.trim();
    if home.is_empty() { return Err("User home directory not found".to_string()); }
    client.execute_command(&format!("sudo mkdir -p {}/.ssh && sudo chmod 700 {}/.ssh", home, home)).map_err(|e| e.message)?;
    client.execute_command(&format!("echo '{}' | sudo tee -a {}/.ssh/authorized_keys", key, home)).map_err(|e| e.message)?;
    client.execute_command(&format!("sudo chown -R {}: {}/.ssh && sudo chmod 600 {}/.ssh/authorized_keys", username, home, home)).map_err(|e| e.message)?;
    Ok("SSH key added successfully".to_string())
}

#[tauri::command]
pub async fn delete_ssh_key(username: String, key_index: usize, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    let home_output = client.execute_command(&format!("getent passwd {} | cut -d: -f6", username)).map_err(|e| e.message)?;
    let home = home_output.trim();
    if home.is_empty() { return Err("User home directory not found".to_string()); }
    let keys_output = client.execute_command(&format!("sudo cat {}/.ssh/authorized_keys 2>/dev/null || echo ''", home)).unwrap_or_default();
    let keys: Vec<&str> = keys_output.lines().filter(|l| !l.trim().is_empty()).collect();
    if key_index >= keys.len() { return Err("Invalid key index".to_string()); }
    let new_keys: Vec<&str> = keys.iter().enumerate().filter(|(i, _)| *i != key_index).map(|(_, &k)| k).collect();
    if new_keys.is_empty() {
        client.execute_command(&format!("sudo rm -f {}/.ssh/authorized_keys", home)).map_err(|e| e.message)?;
    } else {
        let new_content = new_keys.join("\n");
        client.execute_command(&format!("echo '{}' | sudo tee {}/.ssh/authorized_keys", new_content, home)).map_err(|e| e.message)?;
    }
    Ok("SSH key deleted successfully".to_string())
}

#[tauri::command]
pub async fn create_group(group_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    client.execute_command(&format!("sudo groupadd {}", group_name)).map_err(|e| e.message)?;
    Ok(format!("Group '{}' created successfully", group_name))
}

#[tauri::command]
pub async fn delete_group(group_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let ssh_client = state.ssh_client.lock().await;
    let client = ssh_client.as_ref().ok_or("Not connected")?;
    if group_name == "root" || group_name == "sudo" || group_name == "wheel" || group_name.is_empty() {
        return Err("Cannot delete protected group".to_string());
    }
    client.execute_command(&format!("sudo groupdel {}", group_name)).map_err(|e| e.message)?;
    Ok(format!("Group '{}' deleted successfully", group_name))
}
