module "standard" {
  source = "../modules/cluster"

  name   = "standard"
  region = "eu-west"
}

resource "local_file" "kubeconfig_standard" {
  filename = "../kubeconfig"
  content  = module.standard.kubeconfig
}

output "standard_scale_to_3" {
  value = "linode-cli lke pool-update ${module.standard.cluster_id} ${module.standard.pool_id} --count 3"
}

module "hpa" {
  source = "../modules/cluster"

  name   = "hpa"
  region = "eu-west"
}

resource "local_file" "kubeconfig_hpa" {
  filename = "../kubeconfig-hpa"
  content  = module.hpa.kubeconfig
}

output "hpa_scale_to_3" {
  value = "linode-cli lke pool-update ${module.hpa.cluster_id} ${module.hpa.pool_id} --count 3"
}