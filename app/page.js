"use client";
import { useEffect, useState } from "react";
import { GraphQLClient, gql } from "graphql-request";
import { Web3Provider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { formatEther, parseEther } from "@ethersproject/units";
import {
  Card,
  Avatar,
  Row,
  Col,
  Button,
  Input,
  Space,
  message,
  Popconfirm,
  Table,
  Tabs,
  Checkbox
} from "antd";
import {
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined
} from "@ant-design/icons";
import styles from "./page.module.css";
// import "antd/dist/antd.css";

const { Meta } = Card;

const client = new GraphQLClient("https://api.lens.dev");
const subgraphClient = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-mumbai"
);

const cfav1ForwarderABI = [
  "function createFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)",
  "function updateFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)",
  "function deleteFlow(address token, address sender, address receiver, bytes userData) returns (bool)"
];

const CFAV1_FORWARDER_ADDRESS = "0xcfA132E353cB4E398080B9700609bb008eceB125"; // mumbai testnet
const SUPER_TOKEN_ADDRESS = "0x5d8b4c2554aeb7e86f387b4d6c00ac33499ed01f"; // fdaix on mumbai testnet

const PROFILES_QUERY = gql`
  query profiles($request: ProfileQueryRequest!) {
    profiles(request: $request) {
      items {
        id
        name
        handle
        bio
        followNftAddress
        metadata
        ownedBy
        coverPicture {
          ... on NftImage {
            uri
          }
          ... on MediaSet {
            original {
              url
            }
          }
        }
        picture {
          ... on NftImage {
            uri
          }
          ... on MediaSet {
            original {
              url
            }
          }
        }
        stats {
          totalFollowers
          totalFollowing
          totalPosts
        }
      }
    }
  }
`;

const STREAMS_QUERY = gql`
  query getStreams(
    $skip: Int
    $first: Int
    $orderBy: Stream_orderBy
    $orderDirection: OrderDirection
    $where: Stream_filter
  ) {
    streams(
      skip: $skip
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      sender {
        id
      }
      receiver {
        id
      }
      token {
        id
      }
      currentFlowRate
      createdAtTimestamp
      updatedAtTimestamp
    }
  }
`;

const calculateFlowRateInTokenPerMonth = (amount) => {
  if (isNaN(amount)) return 0;
  // convert from wei/sec to token/month for displaying in UI
  const flowRate = (formatEther(amount) * 2592000).toFixed(9);
  // if flowRate is floating point number, remove unncessary trailing zeros
  return flowRate.replace(/\.?0+$/, "");
};

const calculateFlowRateInWeiPerSecond = (amount) => {
  // convert amount from token/month to wei/second for sending to superfluid
  const flowRateInWeiPerSecond = parseEther(amount.toString())
    .div(2592000)
    .toString();
  return flowRateInWeiPerSecond;
};

export default function Home() {
  const [profile, setProfile] = useState({});
  const [dataLoading, setDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [streamInput, setStreamInput] = useState({});
  const [account, setAccount] = useState(null);
  const [cfav1Forwarder, setCfav1Forwarder] = useState(null);
  const [flowRateInput, setFlowRateInput] = useState(0);
  const [streams, setStreams] = useState([]);
  const [paginationOptions, setPaginationOptions] = useState({
    first: 100,
    skip: 0
  });
  const [showAllSponsorships, setShowAllSponsorships] = useState(true);
  const [updatedFlowRate, setUpdatedFlowRate] = useState(null);

  const handleConnectWallet = async () => {
    if (window?.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      console.log("Using account: ", accounts[0]);
      const provider = new Web3Provider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      if (chainId !== 80001) {
        message.info("Switching to mumbai testnet");
        // switch to the mumbai testnet
        await window.ethereum
          .request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x13881" }]
          })
          .catch(async (err) => {
            // This error code indicates that the chain has not been added to MetaMask.
            console.log("err on switch", err);
            if (err.code === 4902) {
              message.info("Adding mumbai testnet to metamask");
              await window.ethereum
                .request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0x13881",
                      chainName: "Polygon Mumbai Testnet",
                      nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18
                      },
                      rpcUrls: [
                        "https://matic-mumbai.chainstacklabs.com",
                        "https://rpc-mumbai.maticvigil.com"
                      ],
                      blockExplorerUrls: ["https://mumbai.polygonscan.com"]
                    }
                  ]
                })
                .then(() => message.info("Switched to mumbai testnet"))
                .catch((err) => {
                  message.error("Error adding mumbai testnet to metamask");
                  console.error(err);
                });
            }
          });
      }
      console.log("chainId:", chainId);
      setAccount(accounts[0].toLowerCase());
      const cfav1Forwarder = new Contract(
        CFAV1_FORWARDER_ADDRESS,
        cfav1ForwarderABI,
        provider.getSigner()
      );
      setCfav1Forwarder(cfav1Forwarder);
    } else {
      console.warn("Please use web3 enabled browser");
      message.warn("Please install Metamask or any other web3 enabled browser");
    }
  };

  const handleCreateStream = async ({
    token,
    sender = account,
    receiver,
    flowRate
  }) => {
    console.log("create inputs: ", { token, sender, receiver, flowRate });
    if (!flowRateInput) return message.error("Please enter a valid flow rate");
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await cfav1Forwarder.createFlow(
        SUPER_TOKEN_ADDRESS,
        sender,
        receiver,
        flowRateInWeiPerSecond,
        "0x"
      );
      await tx.wait();
      message.success("Stream created successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to create stream");
      console.error("failed to create stream: ", err);
    }
  };

  const handleUpdateStream = async ({
    token,
    sender = account,
    receiver,
    flowRate
  }) => {
    console.log("update inputs: ", { token, sender, receiver, flowRate });
    if (!flowRate) return message.error("Please enter new flow rate");
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await cfav1Forwarder.updateFlow(
        token,
        sender,
        receiver,
        flowRateInWeiPerSecond,
        "0x"
      );
      await tx.wait();
      message.success("Stream updated successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to update stream");
      console.error("failed to update stream: ", err);
    }
  };

  const handleDeleteStream = async ({ token, sender, receiver }) => {
    console.log("delete inputs: ", { token, sender, receiver });
    try {
      setLoading(true);
      const tx = await cfav1Forwarder.deleteFlow(token, sender, receiver, "0x");
      await tx.wait();
      message.success("Stream deleted successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to delete stream");
      console.error("failed to delete stream: ", err);
    }
  };

  const fetchProfile = async () => {
    setDataLoading(true);
    // update search filters based on type
    client
      .request(PROFILES_QUERY, {
        request: {
          limit: 10,
          handles: searchQuery
            ? [
              searchQuery.endsWith(".lens")
                ? searchQuery
                : searchQuery + ".lens"
            ]
            : ["stani.lens"]
        }
      })
      .then((data) => {
        console.log("profiles: ", data.profiles.items);
        setProfile(data.profiles.items[0]);
        setDataLoading(false);
      })
      .catch((err) => {
        setDataLoading(false);
        message.error("Something went wrong. Is the Subgraph running?");
        console.error("failed to get profiles: ", err);
      });
  };

  useEffect(() => {
    if (profile) {
      const { ownedBy } = profile;
      console.log("flowsOwned: ", ownedBy);
      getStreams(ownedBy);
    }
  }, [profile]);

  const getStreams = (receiver, sender) => {
    setLoading(true);
    // update search filters based on type
    // const { type, token, searchInput } = searchFilter;
    // const filterObj = {};
    // if (token) filterObj.token = token;
    // if (type === "INCOMING") {
    //   filterObj.receiver = account;
    // } else if (type === "OUTGOING") {
    //   filterObj.sender = account;
    // } else if (type === "TERMINATED") {
    //   filterObj.currentFlowRate = "0";
    // }
    subgraphClient
      .request(STREAMS_QUERY, {
        ...paginationOptions,
        orderBy: "createdAtTimestamp",
        orderDirection: "desc",
        where: {
          token: SUPER_TOKEN_ADDRESS.toLowerCase(),
          receiver: receiver?.toLowerCase(),
          currentFlowRate_gt: "0",
          sender
        }
      })
      .then((data) => {
        console.log("streams: ", data.streams);
        setStreams(data.streams);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        message.error("Something went wrong!");
        console.error("failed to get streams: ", err);
      });
  };

  const sponsorshipColumns = [
    {
      title: "Sponsor",
      key: "sender",
      ellipsis: true,
      width: "10%",
      render: ({ sender }) => (
        <a
          href={`https://goerli.etherscan.io/address/${sender?.id}`}
          target="_blank"
          rel="noreferrer"
        >
          {sender?.id === account ? `${sender?.id} (You)` : sender?.id}
        </a>
      )
    },
    {
      title: "Amount",
      key: "flowRate",
      sorter: (a, b) => a.flowRate.localeCompare(b.flowRate),
      width: "5%",
      render: ({ currentFlowRate, token }) => {
        // calculate flow rate in tokens per month
        const monthlyFlowRate =
          calculateFlowRateInTokenPerMonth(currentFlowRate);
        return (
          <span style={{ color: "#1890ff" }}>{monthlyFlowRate} fDAIx/mo</span>
        );
      }
    },
    {
      title: "Actions",
      width: "5%",
      render: (row) => (
        <>
          {row?.sender?.id === account?.toLowerCase() && (
            <Space size="small">
              <Popconfirm
                title={
                  <Input
                    type="number"
                    placeholder="Flowrate in no. of tokens"
                    addonAfter="/month"
                    value={updatedFlowRate}
                    onChange={(e) => setUpdatedFlowRate(e.target.value)}
                  />
                }
                // add descrition as input number to update flow rate
                description="Enter new flow rate"
                onConfirm={() =>
                  handleUpdateStream({
                    token: row?.token?.id,
                    sender: account,
                    receiver: row?.receiver?.id,
                    flowRate: updatedFlowRate
                  })
                }
              >
                <Button type="primary" shape="circle">
                  <EditOutlined />
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Are you sure to delete?"
                onConfirm={() =>
                  handleDeleteStream({
                    token: row?.token?.id,
                    sender: account,
                    receiver: row?.receiver?.id
                  })
                }
              >
                <Button type="primary" shape="circle" danger>
                  <DeleteOutlined />
                </Button>
              </Popconfirm>
            </Space>
          )}
        </>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <h1>Lenfluencer</h1>
      <Input.Search
        placeholder="Search by handle"
        size="large"
        value={searchQuery}
        enterButton
        allowClear
        onSearch={fetchProfile}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {profile && (
        <Card
          cover={<img src={profile?.coverPicture?.original?.url} alt="Cover" />}
        >
          <Row gutter={16} align="middle">
            <Col>
              <Avatar size={80} src={profile?.picture?.original?.url} />
            </Col>
            <Col flex="auto">
              <Meta title={profile?.name} description={profile?.handle} />
            </Col>
          </Row>
          <Row style={{ marginTop: "16px" }}>
            <Col span={24}>
              <div>
                <span>{profile?.bio}</span>
              </div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: "16px" }}>
            <Col span={8}>
              <div>
                <span>
                  <b>{profile?.stats?.totalFollowers}</b> Followers
                </span>
              </div>
            </Col>
            <Col span={8}>
              <div>
                <span>
                  <b>{profile?.stats?.totalFollowing}</b> Following
                </span>
              </div>
            </Col>
            <Col span={8}>
              <div>
                <span>
                  <b>{profile?.stats?.totalPosts}</b> Posts
                </span>
              </div>
            </Col>
          </Row>
          <Row style={{ marginTop: "16px" }}>
            <Col span={24}>
              <Popconfirm
                title={`Sponsor ${profile?.handle}`}
                description={
                  <Space direction="vertical">
                    <Input
                      type="number"
                      name="flowRate"
                      addonAfter="fDAIx/month"
                      placeholder="Flowrate in no. of tokens"
                      value={flowRateInput}
                      onChange={(e) => setFlowRateInput(e.target.value)}
                      style={{
                        borderRadius: 10,
                        marginBottom: 10
                        // width: 120
                      }}
                    />
                    <p>
                      *You are Streaming <b>{flowRateInput || 0} fDAIx/month</b>{" "}
                      to {profile?.handle}
                    </p>
                  </Space>
                }
                onConfirm={
                  account
                    ? () =>
                      handleCreateStream({
                        token: SUPER_TOKEN_ADDRESS,
                        sender: account,
                        receiver: profile?.ownedBy,
                        flowRate: flowRateInput
                      })
                    : handleConnectWallet
                }
                okText={account ? "Sponsor" : "Connect Wallet"}
                cancelText="Cancel"
                onCancel={() => { }}
              >
                <Button type="primary" style={{ backgroundColor: "#bf3989" }}>
                  Sponsor
                </Button>
              </Popconfirm>
            </Col>
          </Row>
          <Tabs
            // onChange={ }
            type="line"
            animated
            defaultActiveKey="posts"
            style={{ marginBottom: 20 }}
            items={[
              {
                key: "posts",
                label: "Posts", children: <h2>Posts</h2>
              },
              {
                key: "sponsorships",
                label: "Sponsorships",
                children: (
                  <div>
                    <Row justify="end">
                      <Checkbox
                        defaultChecked={true}
                        onChange={(e) => {
                          if (e.target.checked) {
                            getStreams(profile?.ownedBy);
                          } else {
                            getStreams(
                              profile?.ownedBy,
                              account?.toLowerCase()
                            );
                          }
                        }}
                      >
                        Show All
                      </Checkbox>
                    </Row>
                    <Row>
                      <h3>Sponsorships</h3>
                      <Col span={24}>
                        <Table
                          className="table_grid"
                          columns={sponsorshipColumns}
                          rowKey="id"
                          dataSource={streams}
                          loading={dataLoading}
                          pagination={{
                            pageSizeOptions: [5, 10, 20, 25, 50, 100],
                            showSizeChanger: true,
                            showQuickJumper: true,
                            defaultCurrent: 1,
                            defaultPageSize: 10,
                            size: "small"
                          }}
                        />
                      </Col>
                    </Row>
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}
    </div>
  );
}
