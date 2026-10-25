# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Infrastructure teams moving off VMware vSphere/vCenter onto Microsoft Hyper-V. They
know vCenter's workflow well: an inventory tree of clusters, hosts, folders and VMs,
a detail pane per object, a recent-tasks list, power and lifecycle actions, and an
in-browser console. They want to keep working that way on Hyper-V. They run many
hosts and clusters and use the console all day to run their fleet.

Access is role-based and enforced by the server. Regular operators run day-to-day
VM work; admins also manage agents, tags, the audit log (Events), VM locks and host
actions (Pause/Resume Node, Restart Host).

## Product Purpose

Open vCenter (OVC) is an open source virtualization management center. Today it
manages Microsoft Hyper-V clusters, hosts and virtual machines. Users browse the
inventory, run VM lifecycle and power actions, edit hardware, manage templates and
ISOs, and open a VM or host console from the browser.

Success means a team that used vCenter can run its Hyper-V estate from OVC without
retraining, without a proprietary licence, and without installing a client.

## Positioning

- **Open source, Apache-2.0, self-hosted.** A free alternative to proprietary
  management such as vCenter or SCVMM. Every component and backing service is an
  ordinary container the user runs themselves (Docker Compose or Kubernetes).
- **Built for scale.** The frontend talks only to the backend's REST API. The
  backend publishes every operation as a `Task` on RabbitMQ, and a lightweight agent
  on each host runs it and reports back asynchronously. The design target is managing
  hundreds of thousands of VMs.
- **A familiar Explorer/vCenter-style UI.** The console is one Windows-style window:
  menu bar, inventory tree, detail tabs, Recent Tasks dock and status bar. Its
  selectable themes (Windows Classic, Windows XP, Windows 7, Classic MacOS, 16bit
  Overload, VMware Nostalgia, Modern Light/Dark) are a deliberate part of its
  identity, not decoration.
- **Browser-only consoles.** HTML5 Hyper-V VM consoles and host RDP through guacd,
  in the page or in a separate browser tab, with no client install.

## Operating Context

- Operations are asynchronous tasks. Users start an action, then watch it in Recent
  Tasks while they keep working. Polling and task tracking are core to the experience.
- Sign-in uses an optional OIDC provider (Keycloak or another). Admin-only UI is
  hidden by role, never by a client-side scope.
- Deployed self-hosted, from the published GHCR images, with Docker Compose or plain
  Kubernetes manifests.
- Tested hosts: Windows 11, Windows Server 2022 and 2025. 2019 and 2016 should also
  work.

## Capabilities and Constraints

Available: BIOS/UEFI VM creation and management, disk and virtual NIC management,
snapshots, ISO mount/unmount, autostart order, batch start/stop, basic CPU/memory/
network metrics for VMs and hosts, HTML5 consoles to Windows and Linux VMs, folders,
tags, templates, audit log and VM locks.

Planned, not shipped: vTPM, vGPU management, cluster host affinity/anti-affinity,
DRS-like storage workload distribution, and agents for hypervisors other than Hyper-V.
Future work must not present these as available.

Terminology follows vCenter and Hyper-V: cluster, host, VM, folder, template,
snapshot (checkpoint), agent, task, events. UI copy is in English. Menu item labels
have no trailing ellipsis.

## Brand Commitments

- Name: **Open vCenter**, short form **OVC**. "vCenter" names the general idea of a
  virtualization management center, not VMware's product.
- OVC is independent and community-driven, with no affiliation to or endorsement by
  Microsoft, VMware or Broadcom. Never imply a partnership or vendor endorsement.
  Third-party marks belong to their owners.
- Logo: `ovc-logo.svg` / `ovc-logo-dark.svg` in the Open vCenter repo's `.github/`.
- The retro, Explorer-style theme range is a binding part of the product's identity.

## Evidence on Hand

- Public live demo: https://demo.openvcenter.com/ (built from this repo's `demo`
  branch).
- Website and docs: https://openvcenter.com.
- Screenshots: `Open vCenter/docs/screenshots/` (VM details, host details and more).
- Changelog: `CHANGELOG.md`, plus GitHub Releases.
- No customer testimonials, adoption figures, benchmarks or case studies exist yet.
  "Hundreds of thousands of VMs" is the architectural design target, not a measured
  benchmark. Do not invent any of these.

## Product Principles

1. **Familiar first.** A vCenter user should find things where they expect them.
   Prefer the established Explorer/vCenter pattern over novelty.
2. **Honest about asynchronous work.** Every action is a task. Always show what is
   running, what finished and what failed. Never fake instant success.
3. **Scale-ready by default.** Design every list, tree and view for very large
   inventories, not for a demo with ten VMs.
4. **Nothing to install.** Everything, consoles included, works in the browser
   against infrastructure the user hosts.
5. **Truthful claims.** Show only shipped capability. Planned items stay labelled as
   planned.
