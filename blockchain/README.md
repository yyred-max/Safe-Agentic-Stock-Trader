# Blockchain Layer - Safe Agentic Stock Trader (Base Sepolia)

Modul ini berisi smart contract ERC-20 (`MockStockToken`) untuk merepresentasikan tokenized equity (Mock NVDA / `mNVDA`) pada jaringan **Base Sepolia**.

---

## 📋 Prasyarat

1. **Node.js** (v18 atau lebih baru).
2. **MetaMask Wallet** dengan jaringan **Base Sepolia** (Chain ID: `84532`).
3. **Testnet ETH (Base Sepolia)** untuk membayar gas fee transaksi deployment.
   - Faucet Base Sepolia: [faucets.chain.link](https://faucets.chain.link/) atau [base.org/faucets](https://www.base.org/faucets)

---

## 🚀 Panduan Eksekusi Langkah Demi Langkah

### Langkah 1: Masuk ke Direktori Blockchain & Install Dependensi
Buka terminal dan jalankan:
```bash
cd blockchain
npm install
```

---

### Langkah 2: Konfigurasi File `.env`
Salin template konfigurasi `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
*(Di Windows PowerShell: `Copy-Item .env.example .env`)*

Buka file `.env` dan isi nilai berikut:
```env
# Private key akun MetaMask (Export dari MetaMask -> Account details -> Show private key)
# JANGAN PERNAH commit file .env ini ke GitHub / git!
PRIVATE_KEY=your_private_key_here_tanpa_tanda_kutip

# RPC URL untuk Base Sepolia
RPC_URL=https://sepolia.base.org
```

> **Keamanan:** File `.env` sudah masuk dalam `.gitignore` sehingga tidak akan terunggah ke repositori publik.

---

### Langkah 3: Compile Smart Contract
Jalankan kompilasi untuk memastikan kontrak tidak memiliki error:
```bash
npx hardhat compile
```
Jika sukses, Anda akan melihat pesan:
```
Compiled 1 Solidity file successfully (or Compiled 6 Solidity files successfully)
```

---

### Langkah 4: Deploy ke Base Sepolia
Jalankan perintah deployment menggunakan network `baseSepolia`:
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

Hasil output terminal akan menampilkan informasi kontrak:
```text
==================================================
Deploying MockStockToken (mNVDA)...
Deployer address: 0xYourWalletAddress...
==================================================
MockStockToken deployed successfully!
Contract Address : 0xContractAddress...
Token Name       : Mock NVDA
Token Symbol     : mNVDA
Initial Supply   : 1,000,000 mNVDA (to deployer)
Explorer Link    : https://sepolia.basescan.org/address/0xContractAddress...
==================================================
```

Simpan alamat **Contract Address** yang tercetak untuk digunakan pada konfigurasi frontend/execution layer (`NEXT_PUBLIC_MOCK_STOCK_ADDRESS`).
