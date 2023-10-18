terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.23.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "2.11.0"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

variable "kubeconfig_path" {
  type = string
}

locals {
  keda_namespace  = "default"
  prometheus_namespace = "default"
}

resource "helm_release" "keda" {
  name      = "keda"
  chart     = "https://kedacore.github.io/charts/keda-2.11.2.tgz"
  namespace = local.keda_namespace
  depends_on = [
    null_resource.node_label
  ]
}

resource "null_resource" "node_label" {
  provisioner "local-exec" {
    command = "kubectl label nodes $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}' --kubeconfig=${var.kubeconfig_path}) node=primary --kubeconfig=${var.kubeconfig_path} --overwrite"
  }
}

resource "helm_release" "prometheus" {
  name      = "prometheus"
  chart     = "https://github.com/prometheus-community/helm-charts/releases/download/prometheus-25.0.0/prometheus-25.0.0.tgz"
  namespace = local.prometheus_namespace

  set {
    name  = "server.global.scrape_interval"
    value = "10s"
  }

  set {
    name  = "server.global.evaluation_interval"
    value = "10s"
  }
  depends_on = [
    null_resource.node_label
  ]
}

# https://medium.com/@danieljimgarcia/dont-use-the-terraform-kubernetes-manifest-resource-6c7ff4fe629a
resource "null_resource" "expose" {
  triggers = {
    invokes_me_everytime = uuid()
    kubeconfig_path      = var.kubeconfig_path
    current_path         = path.module
  }

  provisioner "local-exec" {
    command = "kubectl apply --kubeconfig=${var.kubeconfig_path} -f ${path.module}/locust.yaml"
  }

  # https://github.com/hashicorp/terraform/issues/23679#issuecomment-885063851
  provisioner "local-exec" {
    command = "kubectl delete --kubeconfig=${self.triggers.kubeconfig_path} --ignore-not-found=true -f ${self.triggers.current_path}/locust.yaml"
    when    = destroy
  }
}