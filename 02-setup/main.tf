module "label_standard" {
  source = "../modules/label"

  kubeconfig_path = abspath("../kubeconfig")
}

module "autoscaling_hpa" {
  source = "../modules/autoscaling"

  kubeconfig_path = abspath("../kubeconfig")
}