# Non-secret settings for the prod stage. Secrets come from manager/.env(.prod)
# via scripts/tf.mjs — never put them in this file.

region = "ap-south-1"

# Keep false while the Serverless prod stack is live (it already runs the jobs).
# Flip to true as part of the cutover, AFTER disabling or removing the Serverless
# schedules — see infra/README.md.
enable_schedules = false

# Optional stable API hostname (ACM certificate must be in ap-south-1):
# api_domain_name     = "api.money.manasranjan.dev"
# api_certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/..."
