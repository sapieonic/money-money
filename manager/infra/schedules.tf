# ---------------------------------------------------------------------------
# Scheduled jobs — equivalent of Serverless `schedule` events.
#
# Rules are always created but stay DISABLED unless var.enable_schedules is
# true, so a Terraform stack can run side by side with the Serverless stack
# without double-firing jobs (processDebtPayments is not idempotent).
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "schedule" {
  for_each = local.schedules

  name                = "${local.name_prefix}-${each.key}"
  description         = each.value.description
  schedule_expression = each.value.expression
  state               = var.enable_schedules && each.value.enabled ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "schedule" {
  for_each = local.schedules

  rule = aws_cloudwatch_event_rule.schedule[each.key].name
  arn  = aws_lambda_function.fn[each.value.function].arn
}

resource "aws_lambda_permission" "schedule" {
  for_each = local.schedules

  statement_id  = "AllowEventBridgeInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn[each.value.function].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule[each.key].arn
}
