# Non-secret settings for the dev stage. Secrets come from manager/.env(.dev)
# via scripts/tf.mjs — never put them in this file.

region = "ap-south-1"

# Which stack runs the scheduled jobs is NOT set here: it is
# params.<stage>.serverlessRunsSchedules in serverless.yml, read by both stacks.
