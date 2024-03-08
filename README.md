# Bitcoin Analytics App

## Introduction

This guide outlines the setup process for the Bitcoin Analytics App, a NestJS-based application that imports and analyzes Bitcoin blockchain data using a Bitcoin Core node and stores it in a MySQL database.

## Prerequisites

- Node.js (LTS version)
- NestJS CLI
- Bitcoin Core (v0.20.0 or later recommended)
- MySQL (v5.7 or later)

## Setup Instructions

### 1. NestJS Setup

- **Install Node.js**: Download and install the LTS version from [Node.js official website](https://nodejs.org/).

- **Install NestJS CLI**: Open your terminal and run the following command:

  ```bash
  npm i -g @nestjs/cli
  ```

- **Project Setup**: Clone the project repository and install dependencies:
  ```bash
  git clone <your-repository-url>
  cd <project-directory>
  npm install
  ```

### 2. Bitcoin Core Configuration

- **Edit Bitcoin Core Config**: Locate your `bitcoin.conf` file and add the following lines to configure the RPC server, enable the transaction index, and adjust the RPC work queue. The `bitcoin.conf` file is typically found in the Bitcoin data directory.

  ```
  server=1
  txindex=1
  rpcuser=<your-rpc-username>
  rpcpassword=<your-rpc-password>
  rpcworkqueue=128
  ```

- **Restart Bitcoin Core**: For the changes to take effect, restart your Bitcoin Core node.

### 3. Linux Configuration

- **Increase `ulimit`**: To increase the number of allowable open files for the system, which is beneficial for both Bitcoin Core and the MySQL database, you can use the following command:
  ```bash
  ulimit -n 4096
  ```
  It's recommended to add this command to your `.bashrc` or `.bash_profile` for persistence across sessions.

### 4. Environment Configuration

- **Configure `.env` File**: Create a `.env` file in the root of your project directory with the following contents, adjusting values according to your setup:
  ```
  DB_HOST=localhost
  DB_PORT=3306
  DB_USERNAME=<your-mysql-username>
  DB_PASSWORD=<your-mysql-password>
  DB_DATABASE=bitcoin_analytics
  NODE_RPC_URL=http://<your-rpc-user>:<your-rpc-password>@localhost:8332/
  ```

### 5. Starting the App

- **Run the Application**: With your environment configured, you can start the application by running:
  ```bash
  npm run start
  ```
  This will start the NestJS server, and the application will begin to import data from your configured Bitcoin Core node into the MySQL database.

## Note

Ensure that your Bitcoin Core node is fully synchronized with the blockchain before starting the import process. Depending on the blockchain size and your system's specifications, synchronization and data import might take some time.
