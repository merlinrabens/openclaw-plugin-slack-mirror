# VHS tape: Slack Mirror demo
# Renders to docs/media/demo.gif
# Run from this directory: vhs demo.tape

Output docs/media/demo.gif

Set FontSize 14
Set Width 1100
Set Height 600
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set PlaybackSpeed 1.0

# Hide setup commands so they don't appear in the GIF
Hide
Type "clear"
Enter
Sleep 200ms
Show

# Run the printable demo script
Type "bash docs/media/demo-script.sh"
Enter
Sleep 18s
