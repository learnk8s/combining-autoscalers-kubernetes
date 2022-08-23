# Prewarming Kubernetes nodes for quicker scaling

This project helps you create a cluster that has idle nodes ready to deploy new wokloads.

## Getting started

You need to create a Linode token to access the API:

```bash
linode-cli profile token-create
export LINODE_TOKEN=<insert the token here>
```

```bash
# Create the cluster
terraform -chdir=01-clusters init
terraform -chdir=01-clusters apply -auto-approve

# Tag the first node
kubectl label nodes $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') node=primary

# Scale to 3 nodes
linode-cli lke pool-update <cluster id> <pool id> --count 3
```

_Why scaling to 3 nodes after the first step?_

This is to make sure that all LKE's controllers end up in the same node and you can tag that node uniquely.

## Demo

Make sure that your kubectl is configured with the current kubeconfig file:

```bash
export KUBECONFIG="${PWD}/kubeconfig"
```

The execute:

```bash
kubectl apply -f 02-demo/podinfo.yaml
```

When ready, observe the node scaling up with:

```bash
kubectl scale deployment/podinfo --replicas=5
```

Or use the dashboard.

The total scaling time for the 5th pod should take ~2m.

Scale back to 1 and submit the placeholder pod with:

```bash
kubectl scale deployment/podinfo --replicas=1
kubectl apply -f 02-demo/placeholder.yaml
```

Repeat the experiment. The total scaling time should go down to ~10s.

## Dashboard

```bash
kubectl proxy --www=./dashboard
```
