terraform {
  # 1.11+: S3-native state locking (`use_lockfile`) is GA from 1.11.
  required_version = ">= 1.11"

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
