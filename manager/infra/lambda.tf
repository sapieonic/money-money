data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

# ---------------------------------------------------------------------------
# IAM: one execution role shared by all functions (same as Serverless).
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name_prefix}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_logs" {
  statement {
    actions = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-*:*",
    ]
  }
}

resource "aws_iam_role_policy" "lambda_logs" {
  name   = "logs"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_logs.json
}

# ---------------------------------------------------------------------------
# Code packages: one zip per handler module, built by scripts/build-lambdas.mjs.
# ---------------------------------------------------------------------------

data "archive_file" "bundle" {
  for_each = local.modules

  type             = "zip"
  source_file      = "${local.build_dir}/${each.key}.js"
  output_path      = "${local.build_dir}/zip/${each.key}.zip"
  output_file_mode = "0644"
}

# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "fn" {
  for_each = local.functions

  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = local.log_retention_days
}

resource "aws_lambda_function" "fn" {
  for_each = local.functions

  function_name = "${local.name_prefix}-${each.key}"
  role          = aws_iam_role.lambda.arn
  runtime       = local.runtime
  handler       = "${each.value.module}.${each.value.export}"
  memory_size   = each.value.memory
  timeout       = each.value.timeout

  filename         = data.archive_file.bundle[each.value.module].output_path
  source_code_hash = data.archive_file.bundle[each.value.module].output_base64sha256

  environment {
    variables = local.environment
  }

  depends_on = [
    aws_cloudwatch_log_group.fn,
    aws_iam_role_policy.lambda_logs,
  ]

  lifecycle {
    precondition {
      condition     = each.value.handler_dir == "src/handlers"
      error_message = "Function ${each.key}: handler must live in src/handlers/ (that is what scripts/build-lambdas.mjs bundles)."
    }
    precondition {
      condition     = length("${local.name_prefix}-${each.key}") <= 64
      error_message = "Function name ${local.name_prefix}-${each.key} exceeds Lambda's 64-character limit."
    }
  }
}
