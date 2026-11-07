terraform {
  # 1.10+ is required for S3-native state locking (`use_lockfile`).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # Partial configuration: bucket/key/region are supplied at `terraform init`
  # time by scripts/tf.mjs (from TF_STATE_BUCKET or backends/<stage>.s3.tfbackend),
  # so each stage gets its own state file.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      Stage     = var.stage
      ManagedBy = "terraform"
    }
  }
}
