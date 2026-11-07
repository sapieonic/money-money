# Non-secret settings for the dev stage. Secrets come from manager/.env(.dev)
# via scripts/tf.mjs — never put them in this file.

region = "ap-south-1"

# Scheduled jobs send real emails/Telegram messages and modify debt balances.
# Only enable on dev if the Serverless dev stack's schedules are not running.
enable_schedules = false
