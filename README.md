# Interactive Isochrone Map of Swiss Public Transport

Author: Florian Burgener

## Prerequisites

* The Rust toolchain, see <https://www.rust-lang.org/>
* OpenSSL (`apt install libssl-dev` on Ubuntu)

## Installation

```sh
git clone https://github.com/florianburgener/hrdf-routing-engine
git clone https://github.com/florianburgener/interactive-isochrone-map
```

## Usage

The first step is to start the routing engine:

```sh
cd hrdf-routing-engine
# Starts the routing engine in web service mode (port 8100):
cargo run --release -- serve
```

To start the application:

```sh
cd ..
cd interactive-isochrone-map/src
# You can open the index.html file with the browser of your choice.
```
