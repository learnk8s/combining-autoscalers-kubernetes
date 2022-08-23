module "eu" {
  source = "../modules/cluster"

  name   = "eu"
  region = "eu-west"
}

resource "local_file" "kubeconfig_eu" {
  filename = "../kubeconfig"
  content  = module.eu.kubeconfig
}

output "cluster_id" {
  value = module.eu.cluster_id
}

output "pool_id" {
  value = module.eu.pool_id
}

output "tag_first_node" {
  value = "kubectl label nodes $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') node=primary"
}

output "scale_to_3" {
  value = "linode-cli lke pool-update ${module.eu.cluster_id} ${module.eu.pool_id} --count 3"
}
