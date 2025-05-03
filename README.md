# Blockchain Tip Jar DApp

A decentralized Ethereum-based tipping application that enables users to tip staff members transparently using cryptocurrency. Built with **Solidity**, **Next.js (TypeScript)**, and deployed on the **Sepolia Testnet**.

---

## 🚀 Features

* 🌐 **Next.js Frontend**: Built with TypeScript for strong typing and modern web structure.
* 💰 **Ethereum Smart Contract**: Written in Solidity and deployed via Remix.
* 🔗 **Alchemy Integration**: Enables smooth interaction with the Sepolia testnet.
* 🔍 **Transaction Explorer**: View all past tips and open them directly on [Etherscan](https://sepolia.etherscan.io/).
* 🧾 **Transparent & Immutable**: All tips are public, traceable, and stored on-chain.

---

## 📸 Screenshots

<!-- Include if available -->

* Tip Form Page
* Transaction History Page
* Etherscan Transaction View

---

## 🛠 Tech Stack

### Frontend:

* [Next.js](https://nextjs.org/) (React framework)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/) (optional styling)
* [MetaMask](https://metamask.io/) for wallet integration

### Blockchain:

* [Solidity](https://soliditylang.org/)
* [Remix IDE](https://remix.ethereum.org/) for contract deployment
* [Sepolia Testnet](https://sepolia.etherscan.io/)

### Infra:

* [Alchemy](https://alchemy.com/) (RPC provider)
* [Ethers.js](https://docs.ethers.org/) for blockchain interaction

---

## ⚙️ Getting Started

1. **Clone the Repository**

```bash
git clone https://github.com/Ajverma2004/TipJar-Blockchain.git
cd TipJar-Blockchain
```

2. **Install Dependencies**

```bash
npm install
```

3. **Create Environment File**

```bash
touch .env.local
```

Add your variables:

```env
NEXT_PUBLIC_ALCHEMY_RPC_URL=your-alchemy-key-here
```

4. **Run the App**

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📜 Smart Contract

Deployed on Sepolia Testnet.

```solidity
function tip(string memory _message) public payable {
    // Accepts ETH and stores sender, amount, and message
}
```

👉 [View on Etherscan](https://sepolia.etherscan.io/) (Add your contract URL)

---

## 💡 Use Cases

* Tipping staff in restaurants/cafés
* Donations for street artists or streamers
* Volunteer rewards at hackathons or events
* Freelancers or gig economy tips

---

## 📈 Future Improvements

* Filter tips per staff
* Tipping leaderboard
* Layer 2 deployment (e.g., Polygon)
* Email/SMS notifications

---

## 🙏 Acknowledgements

* Thanks to [Alchemy](https://alchemy.com/) and [Ethereum](https://ethereum.org/) for developer tools.

---

## 📬 Contact

Ansh Verma – [LinkedIn](https://linkedin.com/in/AnshV) | [GitHub](https://github.com/Ajverma2004)

Feel free to open issues or submit PRs!
