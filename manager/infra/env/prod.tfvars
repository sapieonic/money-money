# Non-secret settings for the prod stage (optional; variables.tf has the
# defaults). Secrets come from manager/.env.prod / .env via scripts/tf.mjs.

# Optional stable API hostname (ACM certificate must be in ap-south-1):
# api_domain_name     = "api.money.manasranjan.dev"
# api_certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/..."
