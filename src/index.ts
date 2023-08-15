import web3 = require('@solana/web3.js')
import Dotenv from 'dotenv'
import * as fs from 'fs';
Dotenv.config()

function initializeKeypair(): web3.Keypair {
  if (!process.env.PRIVATE_KEY) {
    console.log('Generating new keypair... 🗝️');
    const signer = web3.Keypair.generate();

    console.log('Creating .env file');
    fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    return signer;
  }

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = web3.Keypair.fromSecretKey(secretKey);
  return keypairFromSecret;
}

async function airdropSolIfNeeded(
  signer: web3.Keypair,
  connection: web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log('Current balance is', balance / web3.LAMPORTS_PER_SOL, 'SOL');

  // 1 SOL should be enough for almost anything you wanna do
  if (balance / web3.LAMPORTS_PER_SOL < 1) {
    // You can only get up to 2 SOL per request
    console.log('Airdropping 1 SOL');
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log('New balance is', newBalance / web3.LAMPORTS_PER_SOL, 'SOL');
  }
}


async function main() {
  const connection = new web3.Connection("your-quicknode-rpc-devnet-url", "confirmed"); // todo: your need change this
  const payer = initializeKeypair();
  console.log("Payer address: ", payer.publicKey.toBase58())
  await airdropSolIfNeeded(payer, connection);
  let from = payer;
  let to = new web3.PublicKey("ATrkCHG6PnkhVNaVz9tekg4je5cvZcLuZuF5UAxxEvyK");
  console.log("To address: ", to.toBase58())
  await SendSol(connection, from, to, 0.99);
}

main().then(() => {
  console.log("Finished successfully")
}).catch((error) => {
  console.error(error)
})


async function SendSol(connection: web3.Connection, from: web3.Keypair, to: web3.PublicKey, amount: number) {
  const transaction = new web3.Transaction()


  const instruction = new web3.TransactionInstruction(web3.SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to,
    lamports: amount * web3.LAMPORTS_PER_SOL,
  }))

  transaction.add(instruction)

  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [from]
  )

  console.log(`You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)
}
