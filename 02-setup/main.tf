module "label_standard" {
  source = "../modules/label"

  kubeconfig_path = abspath("../kubeconfig")
}
