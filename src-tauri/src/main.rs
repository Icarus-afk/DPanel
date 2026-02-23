// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod compose_discovery;
mod infrastructure_graph;
mod ssh;
mod types;
mod user_commands;

use commands::*;
use infrastructure_graph::*;
use user_commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(commands::AppState::default())
        .manage(infrastructure_graph::InfraGraphState::default())
        .invoke_handler(tauri::generate_handler![
            test_connection,
            connect_to_server,
            disconnect_server,
            get_system_metrics,
            get_docker_containers,
            docker_container_action,
            get_container_logs,
            get_services,
            service_action,
            get_service_logs,
            execute_command,
            save_server_profile,
            get_server_profiles,
            delete_server_profile,
            update_server_profile_metadata,
            get_ufw_status,
            get_ufw_stats,
            get_ufw_overview,
            get_listening_ports,
            ufw_action,
            ufw_add_rule,
            ufw_delete_rule,
            ufw_set_default,
            ufw_set_logging,
            get_container_details,
            get_docker_volumes,
            get_docker_networks,
            get_docker_images,
            get_container_env,
            find_compose_files,
            refresh_compose_files,
            get_container_logs_stream,
            // Nginx
            nginx_status,
            nginx_action,
            nginx_test_config,
            get_nginx_config,
            save_nginx_config,
            get_nginx_vhosts,
            get_vhost_config,
            save_vhost_config,
            enable_vhost,
            disable_vhost,
            delete_vhost,
            get_nginx_logs,
            // Cron
            get_user_crontab,
            save_user_crontab,
            get_system_crontab,
            get_cron_d_jobs,
            get_cron_folders,
            get_cron_logs,
            add_cron_job,
            delete_cron_job,
            toggle_cron_job,
            // User Management
            get_system_users,
            get_system_groups,
            create_user,
            delete_user,
            lock_user,
            unlock_user,
            set_user_password,
            add_user_to_group,
            remove_user_from_group,
            add_ssh_key,
            delete_ssh_key,
            create_group,
            delete_group,
            // Infrastructure Graph
            get_infrastructure_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
