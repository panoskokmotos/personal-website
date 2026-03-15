#!/usr/bin/env python3
"""
Simple Coding Agent
A basic coding assistant that can help with code analysis and generation.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import List, Optional


class CodingAgent:
    """A simple coding agent that helps with coding tasks."""
    
    def __init__(self):
        self.supported_languages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust']
    
    def analyze_file(self, filepath: str) -> dict:
        """Analyze a code file and return basic statistics."""
        try:
            path = Path(filepath)
            if not path.exists():
                return {'error': f'File not found: {filepath}'}
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            total_lines = len(lines)
            code_lines = [line for line in lines if line.strip() and not line.strip().startswith('#')]
            comment_lines = [line for line in lines if line.strip().startswith('#') or '//' in line]
            
            # Detect language from extension
            extension = path.suffix.lower()
            language_map = {
                '.py': 'python',
                '.js': 'javascript',
                '.java': 'java',
                '.cpp': 'cpp',
                '.cc': 'cpp',
                '.go': 'go',
                '.rs': 'rust'
            }
            detected_lang = language_map.get(extension, 'unknown')
            
            return {
                'filepath': str(path.absolute()),
                'language': detected_lang,
                'total_lines': total_lines,
                'code_lines': len(code_lines),
                'comment_lines': len(comment_lines),
                'file_size': len(content),
                'extension': extension
            }
        except Exception as e:
            return {'error': str(e)}
    
    def generate_function_template(self, language: str, function_name: str, 
                                   parameters: List[str] = None) -> str:
        """Generate a function template for the specified language."""
        parameters = parameters or []
        params_str = ', '.join(parameters)
        
        templates = {
            'python': f"def {function_name}({params_str}):\n    \"\"\"\n    TODO: Add function description\n    \"\"\"\n    pass",
            'javascript': f"function {function_name}({params_str}) {{\n    // TODO: Add function implementation\n    return null;\n}}",
            'java': f"public void {function_name}({params_str}) {{\n    // TODO: Add function implementation\n}}",
            'cpp': f"void {function_name}({params_str}) {{\n    // TODO: Add function implementation\n}}",
            'go': f"func {function_name}({params_str}) {{\n    // TODO: Add function implementation\n}}",
            'rust': f"fn {function_name}({params_str}) {{\n    // TODO: Add function implementation\n}}"
        }
        
        return templates.get(language.lower(), f"// {function_name} function template for {language}")
    
    def list_files_in_directory(self, directory: str, pattern: str = '*') -> List[str]:
        """List code files in a directory."""
        try:
            path = Path(directory)
            if not path.exists():
                return []
            
            code_extensions = ['.py', '.js', '.java', '.cpp', '.cc', '.go', '.rs', '.ts', '.jsx', '.tsx']
            files = []
            
            for ext in code_extensions:
                files.extend(path.glob(f'**/*{ext}'))
            
            return [str(f) for f in files]
        except Exception as e:
            print(f"Error listing files: {e}")
            return []
    
    def find_functions(self, filepath: str) -> List[dict]:
        """Find function definitions in a Python file."""
        try:
            path = Path(filepath)
            if not path.exists() or path.suffix != '.py':
                return []
            
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            functions = []
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith('def '):
                    func_name = stripped[4:stripped.find('(')].strip()
                    functions.append({
                        'name': func_name,
                        'line': i,
                        'signature': stripped
                    })
            
            return functions
        except Exception as e:
            print(f"Error finding functions: {e}")
            return []


def main():
    """Main CLI interface for the coding agent."""
    parser = argparse.ArgumentParser(description='Simple Coding Agent - A basic coding assistant')
    parser.add_argument('command', choices=['analyze', 'generate', 'list', 'find-functions'],
                       help='Command to execute')
    parser.add_argument('-f', '--file', help='File path for analyze/find-functions commands')
    parser.add_argument('-d', '--dir', help='Directory path for list command')
    parser.add_argument('-l', '--language', default='python',
                       help='Programming language (default: python)')
    parser.add_argument('-n', '--name', help='Function name for generate command')
    parser.add_argument('-p', '--params', nargs='*', default=[],
                       help='Function parameters for generate command')
    
    args = parser.parse_args()
    agent = CodingAgent()
    
    if args.command == 'analyze':
        if not args.file:
            print("Error: --file is required for analyze command")
            sys.exit(1)
        result = agent.analyze_file(args.file)
        if 'error' in result:
            print(f"Error: {result['error']}")
            sys.exit(1)
        
        print(f"\n📊 Code Analysis for: {result['filepath']}")
        print(f"Language: {result['language']}")
        print(f"Total Lines: {result['total_lines']}")
        print(f"Code Lines: {result['code_lines']}")
        print(f"Comment Lines: {result['comment_lines']}")
        print(f"File Size: {result['file_size']} bytes")
        print(f"Extension: {result['extension']}")
    
    elif args.command == 'generate':
        if not args.name:
            print("Error: --name is required for generate command")
            sys.exit(1)
        template = agent.generate_function_template(args.language, args.name, args.params)
        print(f"\n📝 Generated {args.language} function template:\n")
        print(template)
    
    elif args.command == 'list':
        directory = args.dir or '.'
        files = agent.list_files_in_directory(directory)
        print(f"\n📁 Code files in {directory}:\n")
        for f in files:
            print(f"  - {f}")
        print(f"\nTotal: {len(files)} files")
    
    elif args.command == 'find-functions':
        if not args.file:
            print("Error: --file is required for find-functions command")
            sys.exit(1)
        functions = agent.find_functions(args.file)
        if not functions:
            print(f"No functions found in {args.file}")
        else:
            print(f"\n🔍 Functions found in {args.file}:\n")
            for func in functions:
                print(f"  Line {func['line']}: {func['name']}")
                print(f"    {func['signature']}\n")


if __name__ == '__main__':
    main()

