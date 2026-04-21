terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "routines" {
  name         = "routine-app-dev-routines"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "ownerId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "ownerId-createdAt-index"
    hash_key        = "ownerId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Project     = "routine-app"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}