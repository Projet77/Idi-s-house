
import os

filename = r"c:\Users\Abdou\Documents\Idi's House\assets\css\style.css"
output_filename = filename # In-place edit

try:
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    fixed_lines = []
    start_bad_line = 772 # line 773

    for i, line in enumerate(lines):
        if i >= start_bad_line:
            # Remove null bytes which shouldn't be there in CSS
            fixed_line = line.replace('\x00', '')
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)

    with open(output_filename, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)

    print(f"Successfully processed {len(lines)} lines.")
    
    # Verify the start of the fixed section
    print("Verifying Line 773:")
    print(fixed_lines[start_bad_line].strip())
    print("Verifying Line 774:")
    if len(fixed_lines) > start_bad_line + 1:
        print(fixed_lines[start_bad_line + 1].strip())

except Exception as e:
    print(f"Error: {e}")
