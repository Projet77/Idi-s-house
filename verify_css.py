
import sys

# Use raw string with double quotes to handle single quote in path
filename = r"c:\Users\Abdou\Documents\Idi's House\assets\css\style.css"

try:
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_bad_line = 772  # 0-indexed

    if len(lines) > start_bad_line:
        print("Line 773 raw:", repr(lines[start_bad_line]))
        print("Line 773 decoded:", repr(lines[start_bad_line][::2]))
        
        if len(lines) > start_bad_line + 1:
            print("Line 774 raw:", repr(lines[start_bad_line + 1]))
            print("Line 774 decoded:", repr(lines[start_bad_line + 1][::2]))
    else:
        print("File is too short")
        
except FileNotFoundError:
    print(f"File not found: {filename}")
except Exception as e:
    print(f"Error: {e}")
