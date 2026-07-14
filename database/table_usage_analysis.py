#!/usr/bin/env python3
"""
Análisis de uso de tablas en el código fuente
Identifica tablas huérfanas que no se usan en el código
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_table_names_from_sql(sql_content):
    """Extrae nombres de tablas de contenido SQL"""
    # Patrones comunes para encontrar tablas
    patterns = [
        r'FROM\s+(\w+)',  # FROM table_name
        r'JOIN\s+(\w+)',  # JOIN table_name
        r'INTO\s+(\w+)',  # INSERT INTO table_name
        r'UPDATE\s+(\w+)',  # UPDATE table_name
        r'DELETE\s+FROM\s+(\w+)',  # DELETE FROM table_name
        r'CREATE\s+TABLE\s+(\w+)',  # CREATE TABLE table_name
        r'ALTER\s+TABLE\s+(\w+)',  # ALTER TABLE table_name
        r'DROP\s+TABLE\s+(\w+)',  # DROP TABLE table_name
        r'\.from\([\'"](\w+)[\'"]',  # .from('table_name')
        r'table_name\s*=\s*[\'"](\w+)[\'"]',  # table_name = 'table_name'
    ]
    
    tables = set()
    for pattern in patterns:
        matches = re.findall(pattern, sql_content, re.IGNORECASE)
        tables.update(matches)
    
    return tables

def extract_table_names_from_ts_tsx(file_content):
    """Extrae nombres de tablas de código TypeScript/TSX"""
    patterns = [
        r'\.from\([\'"](\w+)[\'"]',  # supabase.from('table_name')
        r'from\s+[\'"](\w+)[\'"]',  # from 'table_name'
        r'table\s*:\s*[\'"](\w+)[\'"]',  # table: 'table_name'
        r'tableName\s*:\s*[\'"](\w+)[\'"]',  # tableName: 'table_name'
        r'INSERT\s+INTO\s+(\w+)',  # SQL INSERT
        r'FROM\s+(\w+)',  # SQL FROM
        r'JOIN\s+(\w+)',  # SQL JOIN
        r'UPDATE\s+(\w+)',  # SQL UPDATE
        r'DELETE\s+FROM\s+(\w+)',  # SQL DELETE
    ]
    
    tables = set()
    for pattern in patterns:
        matches = re.findall(pattern, file_content, re.IGNORECASE)
        tables.update(matches)
    
    return tables

def scan_directory(directory):
    """Escanea directorio en busca de uso de tablas"""
    table_usage = defaultdict(set)
    
    for root, dirs, files in os.walk(directory):
        # Ignorar directorios comunes
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'dist', '.vercelcache']]
        
        for file in files:
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Extraer tablas según el tipo de archivo
                if file.endswith('.sql'):
                    tables = extract_table_names_from_sql(content)
                elif file.endswith(('.ts', '.tsx')):
                    tables = extract_table_names_from_ts_tsx(content)
                else:
                    continue
                
                for table in tables:
                    table_usage[table.lower()].add(file_path)
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    
    return table_usage

def main():
    """Función principal"""
    print("🔍 ANALIZANDO USO DE TABLAS EN EL CÓDIGO FUENTE...")
    
    # Directorios a escanear
    src_dir = "src"
    supabase_dir = "supabase"
    
    all_usage = defaultdict(set)
    
    # Escanear src
    if os.path.exists(src_dir):
        print(f"Escaneando {src_dir}...")
        src_usage = scan_directory(src_dir)
        for table, files in src_usage.items():
            all_usage[table].update(files)
    
    # Escanear supabase
    if os.path.exists(supabase_dir):
        print(f"Escaneando {supabase_dir}...")
        supabase_usage = scan_directory(supabase_dir)
        for table, files in supabase_usage.items():
            all_usage[table].update(files)
    
    # Lista de tablas comunes en redes sociales (para verificar)
    common_tables = [
        'posts', 'profiles', 'users', 'comments', 'reactions', 'likes', 
        'shares', 'follows', 'friends', 'notifications', 'messages', 
        'groups', 'companies', 'media', 'polls', 'poll_votes', 'ideas',
        'subscriptions', 'payments', 'reports', 'blocks', 'mutes',
        'bookmarks', 'hashtags', 'mentions', 'analytics', 'settings',
        'sessions', 'tokens', 'invitations', 'verification_codes'
    ]
    
    print("\n📊 RESULTADOS DEL ANÁLISIS:")
    print("=" * 60)
    
    used_tables = set(all_usage.keys())
    print(f"\n✅ Tablas encontradas en uso ({len(used_tables)}):")
    for table in sorted(used_tables):
        file_count = len(all_usage[table])
        print(f"  • {table} ({file_count} archivos)")
    
    # Tablas comunes NO encontradas
    unused_common = [t for t in common_tables if t not in used_tables]
    if unused_common:
        print(f"\n⚠️  Tablas comunes NO encontradas en el código:")
        for table in sorted(unused_common):
            print(f"  • {table}")
    
    print(f"\n📋 ARCHIVOS POR TABLA:")
    for table in sorted(all_usage.keys()):
        print(f"\n{table.upper()}:")
        for file_path in sorted(all_usage[table]):
            print(f"  - {file_path}")
    
    print(f"\n🎯 RECOMENDACIONES:")
    print("1. Verifica las tablas marcadas como 'no encontradas'")
    print("2. Las tablas con 0 archivos son candidatas para borrado")
    print("3. Revisa manualmente las tablas con uso sospechoso")
    
    return all_usage

if __name__ == "__main__":
    main()
