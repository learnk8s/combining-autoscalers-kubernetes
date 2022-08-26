terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.12.1"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

variable "kubeconfig_path" {
  type = string
}

resource "null_resource" "node_label" {
  provisioner "local-exec" {
    command = "kubectl label nodes $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}' --kubeconfig=${var.kubeconfig_path}) node=primary --kubeconfig=${var.kubeconfig_path} --overwrite"
  }
}

