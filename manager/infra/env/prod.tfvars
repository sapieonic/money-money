# Non-secret settings for the prod stage. Secrets come from manager/.env(.prod)
# via scripts/tf.mjs — never put them in this file.

region = "ap-south-1"

# Which stack runs the scheduled jobs is NOT set here: it is
# params.<stage>.serverlessRunsSchedules in serverless.yml, read by both stacks.

# Optional stable API hostname (ACM certificate must be in ap-south-1):
# api_domain_name     = "api.money.manasranjan.dev"
# api_certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/..."
