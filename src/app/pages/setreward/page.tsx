"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { MockUSDC } from "@/sc/ca";
import tokenabi from "@/sc/tokenabi.json";
import TriviaABI from "@/sc/trivia.json";
import Web3 from "web3";
import { useRouter } from "next/navigation";
import {
  ref,
  set,
  database,
  get,
  push,
  update as firebaseUpdate,
  getDatabase,
} from "@/config/FirebaseConfig";
import { createClientUPProvider } from "@lukso/up-provider";

const WinningPage = () => {
  const router = useRouter();
  const [amount, setAmount] = useState(null);
  const [provider, setProvider] = useState<any>(null);
  const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>(
    []
  );
  const [profileConnected, setProfileConnected] = useState(false);

  //const provider = "https://mainnet.base.org";
  const providers = "https://sepolia.base.org";

  const web3 = new Web3(providers);
  const dec = 10 ** 6;
  const [isChecking, setIsChecking] = useState(false);
  const [pendingButtonTrnx, setPendingButtonTrnx] = useState(false);
  const [rewardStatus, setRewardStatus] = useState("initial");
  let newContractTriviaBase = null;
  let successTrnx,
    balNum = null;
  const [quizCode, setQuizCode] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);

  // Initialize provider only on client side
  useEffect(() => {
    setProvider(createClientUPProvider());
  }, []);

  const updateConnected = useCallback(
    (
      _accounts: Array<`0x${string}`>,
      _contextAccounts: Array<`0x${string}`>
    ) => {
      setProfileConnected(_accounts.length > 0 && _contextAccounts.length > 0);
    },
    []
  );

  useEffect(() => {
    if (!provider) return; // Only proceed if provider is initialized

    async function init() {
      try {
        const _accounts = provider.accounts as Array<`0x${string}`>;
        setAccounts(_accounts);

        const _contextAccounts = provider.contextAccounts;
        updateConnected(_accounts, _contextAccounts);
      } catch (error) {
        console.error("Failed to initialize provider:", error);
      }
    }

    // Handle account changes
    const accountsChanged = (_accounts: Array<`0x${string}`>) => {
      setAccounts(_accounts);
      updateConnected(_accounts, contextAccounts);
    };

    const contextAccountsChanged = (_accounts: Array<`0x${string}`>) => {
      setContextAccounts(_accounts);
      updateConnected(accounts, _accounts);
    };

    init();

    // Set up event listeners
    provider.on("accountsChanged", accountsChanged);
    provider.on("contextAccountsChanged", contextAccountsChanged);

    // Cleanup listeners
    return () => {
      provider.removeListener("accountsChanged", accountsChanged);
      provider.removeListener("contextAccountsChanged", contextAccountsChanged);
    };
  }, [provider, accounts[0], contextAccounts[0], updateConnected]);

  useEffect(() => {
    const fetchQuizCode = async () => {
      if (!accounts[0]) return;
      const storedWalletAddress = accounts[0];
      console.log(storedWalletAddress);
      const db = getDatabase();
      const quizcodeRef = ref(db, `paid_quizcode/${storedWalletAddress}`);
      try {
        const snapshot = await get(quizcodeRef);
        if (snapshot.exists()) {
          const fetchedQuizCode = snapshot.val().quizCode;
          setQuizCode(fetchedQuizCode);
          console.log("Fetched Quiz Code:", fetchedQuizCode);
        } else {
          console.log("No quiz code found for this wallet address");
        }
      } catch (error) {
        console.error("Error fetching quiz code:", error);
      }
    };

    fetchQuizCode();
  }, [accounts[0]]);

  const onApproveClick = async (_amount) => {
    const createTrivia = async () => {
      setPendingButtonTrnx(true);
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_CREATE_TRIVIA_CONTRACT,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        return data.newContractTriviaBase;
      } catch (err) {
        return err;
      }
    };
    let NEW_CONTRACT_TRIVIA = await createTrivia();
    console.log(`adminn confirm transcation created ${NEW_CONTRACT_TRIVIA}`);

    const transferConfirm = async (contractAddress) => {
      const provider = window.ethereum;
      const web3 = new Web3(provider);
      //check contract just created
      console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
      const contract = new web3.eth.Contract(tokenabi, MockUSDC);

      try {
        const accounts = await provider.request({
          method: "eth_requestAccounts",
        });
        const accountAddress = accounts[0];
        const gasEstimate = await contract.methods
          .transfer(contractAddress, _amount * dec)
          .estimateGas({ from: accountAddress });

        await contract.methods
          .transfer(contractAddress, _amount * dec)
          .send({
            from: accountAddress,
            //@ts-ignore
            gas: gasEstimate,
            //@ts-ignore
            gasPrice: await web3.eth.getGasPrice(),
          })
          .then(() => {
            //successTrnx = true;
          })
          .catch((e) => {
            //successTrnx = false;
            console.error(e);
          });
      } catch (e) {
        console.error(`Error estimating gas or sending transaction: ${e}`);
      }
    };

    const BalanceCheck = async (contractAddress) => {
      const web3 = new Web3(provider);
      console.log("test");
      const contract = new web3.eth.Contract(TriviaABI, contractAddress);
      await contract.methods
        .ReturnContractBalnc()
        .call()
        .then((r) => {
          balNum = Number(r) / dec;
        })
        .catch((e) => {
          console.log("fail to fetch contract balc: ", e);
        });
    };

    if (NEW_CONTRACT_TRIVIA) {
      setIsChecking(true);
      await transferConfirm(NEW_CONTRACT_TRIVIA);
      await BalanceCheck(NEW_CONTRACT_TRIVIA);

      // checks if the contract balance
      // is above zero.
      if (balNum >= 1) {
        //@ts-ignore
        setRewardStatus("success");
        setPendingButtonTrnx(false);
        setIsChecking(false);

        // better fetching balance than
        // a boolean change after a transaction

        const paymentDetails = {
          quizCode,
          timestamp: new Date().toISOString(),
          transactionDetails: {
            from: accounts[0],
            to: NEW_CONTRACT_TRIVIA,
            amount: _amount,
            token: "USDC",
            chainId: 84532,
            network: "Base Sepolia",
          },
          status: "completed",
        };

        /* const paymentDetails = {
          quizCode,
          timestamp: new Date().toISOString(),
          transactionDetails: {
            from: account.address,
            to: newContractTriviaBase,
            amount: _amount,
            token: "USDC",
            chainId: 8453,
            network: "Base",
          },
          status: "completed",
        }; */

        const quizRef = ref(database, `quiz_staking/${quizCode}`);
        const quizcontractRef = ref(
          database,
          `paid_quizzes/${quizCode}/smartContract`
        );

        await firebaseUpdate(quizRef, paymentDetails);
        await firebaseUpdate(quizcontractRef, paymentDetails);

        console.log("Payment details logged:", paymentDetails);
        setIsChecking(false);
        router.push(`./paid_quizcode`);
      } else {
        setRewardStatus("failed");
        console.log("didn't pass the sucess trnx");
      }
    } else {
      setRewardStatus("failed");
      console.log("contract was never created!");
    }
  };
  return (
    <>
      {accounts[0] && (
        <div className="bg-gray-100 min-h-screen flex flex-col">
          <button className="bg-white text-gray-600 h-[72px] flex items-center justify-start mb-1 w-full md:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-14 inline-block ml-4 md:ml-20 bg-white rounded-r-lg shadow-[2px_0px_0px_#DBE7FF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center flex-grow pt-47">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full md:w-96">
              <div className="bg-[#EDEBFF] rounded-t-lg p-4 mb-4 flex items-center justify-center">
                <Image
                  src="/icons/paid.s.png"
                  alt="Email Icon"
                  width={19}
                  height={12}
                />
              </div>
              <h2 className="text-2xl font-semibold text-center mb-4 text-reward">
                {rewardStatus === "initial" && <div>Set a Reward</div>}
                {rewardStatus === "failed" && (
                  <div className="text-red-500">Transaction Failed</div>
                )}
                {rewardStatus === "success" && (
                  <div className="text-green-500">Successful Transaction</div>
                )}
              </h2>
              <p className="text-gray-700 text-center mb-6 text-reward">
                Reward goes to the winner of the game (USDC)
              </p>
              <input
                type="text"
                pattern="[0-9]*\.?[0-9]*"
                placeholder="Enter amount in USDC"
                className="bg-white p-3 rounded-md w-full mb-4 border border-gray-300"
                value={amount}
                onChange={(e) => {
                  //@ts-ignore
                  setAmount(Number(e.target.value));
                }}
              />
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onApproveClick(amount)}
                    /* disabled={isPending} */
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {pendingButtonTrnx ? "Processing..." : "Stake"}
                  </button>
                  {isChecking && (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Confirming payment...</p>
                    </div>
                  )}
                </div>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WinningPage;
