module "label_standard" {
  source = "../modules/label"

  kubeconfig_path = abspath("../kubeconfig")
}

module "label_hpa" {
  source = "../modules/label"

  kubeconfig_path = abspath("../kubeconfig-hpa")
}

module "autoscaling_hpa" {
  source = "../modules/autoscaling"

  kubeconfig_path = abspath("../kubeconfig-hpa")
}
