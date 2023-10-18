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
  value = "linode-cli lke pool-update ${module.standard.cluster_id} ${module.standard.pool_id} --count 2"
}
