# Simple Coding Agent

A lightweight Python-based coding assistant that helps with code analysis, function generation, and file exploration.

## Features

- **Code Analysis**: Analyze code files and get statistics (lines, language detection, file size)
- **Function Generation**: Generate function templates for multiple programming languages
- **File Listing**: List all code files in a directory
- **Function Discovery**: Find all function definitions in Python files

## Installation

This agent uses only Python's standard library, so no installation is required!

Just ensure you have Python 3.7+ installed:

```bash
python3 --version
```

## Usage

### Analyze a code file

Get detailed statistics about a code file:

```bash
python3 agent.py analyze -f path/to/file.py
```

Example output:
```
📊 Code Analysis for: /path/to/file.py
Language: python
Total Lines: 50
Code Lines: 40
Comment Lines: 10
File Size: 1234 bytes
Extension: .py
```

### Generate a function template

Generate a function template for various languages:

```bash
# Python function
python3 agent.py generate -l python -n calculate_sum -p a b

# JavaScript function
python3 agent.py generate -l javascript -n getUserData -p userId

# Java function
python3 agent.py generate -l java -n processData -p data
```

Supported languages: `python`, `javascript`, `java`, `cpp`, `go`, `rust`

### List code files in a directory

Find all code files in a directory:

```bash
# Current directory
python3 agent.py list

# Specific directory
python3 agent.py list -d /path/to/directory
```

### Find functions in a Python file

Discover all function definitions in a Python file:

```bash
python3 agent.py find-functions -f path/to/file.py
```

## Examples

```bash
# Analyze this agent itself
python3 agent.py analyze -f agent.py

# Generate a Python function
python3 agent.py generate -l python -n fibonacci -p n

# List all Python files in current directory
python3 agent.py list

# Find functions in agent.py
python3 agent.py find-functions -f agent.py
```

## Extending the Agent

The `CodingAgent` class is designed to be extensible. You can add new methods to:

- Parse different languages
- Add more code generation features
- Integrate with external tools
- Add code formatting capabilities

## License

MIT License - Feel free to modify and extend!

