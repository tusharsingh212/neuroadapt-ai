import sys

msg = sys.stdin.read()
msg = msg.replace(
    "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n",
    ""
)
sys.stdout.write(msg)