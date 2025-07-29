#!/bin/bash

# Ensure jq is available
if ! command -v jq &> /dev/null; then
    echo "Warning: jq not found, skipping prettier hook" >&2
    exit 0
fi

# Extract the file path from the JSON input
FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.filePath' 2>/dev/null)

# Check if file path was extracted and is a .ts or .tsx file
if [[ -n "$FILE_PATH" && "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    # Check if file exists
    if [[ ! -f "$FILE_PATH" ]]; then
        exit 0
    fi
    
    # Run prettier, capturing stderr for error reporting
    if ERROR=$(npx prettier --write "$FILE_PATH" 2>&1); then
        echo "✓ Prettier formatted: $(basename "$FILE_PATH")"
    else
        echo "Prettier failed for: $FILE_PATH" >&2
        echo "$ERROR" >&2
        # Still exit 0 to not block the save operation
    fi
fi

exit 0
