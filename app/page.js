"use client";
import { useEffect, useState } from "react";
import { GraphQLClient, gql } from "graphql-request";
import { Card, Avatar, Row, Col, Button, Input, Space, message } from "antd";
import styles from "./page.module.css";
// import "antd/dist/antd.css";

const { Meta } = Card;

const client = new GraphQLClient("https://api.lens.dev");

const PROFILES_QUERY = gql`
  query profiles($request: ProfileQueryRequest!) {
    profiles(request: $request) {
      items {
        id
        name
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

const ProfileCard = () => {
  return (
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card
        cover={
          <img
            src={
              "https://ik.imagekit.io/lens/media-snapshot/692020434413dd88dd96a93f9df08cfefd0a3b84abba5772c14a2f56ac01b0cd.jpg"
            }
            alt="Cover"
          />
        }
      >
        <Row gutter={16} align="middle">
          <Col>
            <Avatar
              size={80}
              src={
                "https://gateway.ipfscdn.io/ipfs/bafybeiehsyi2xtlfr7zmsuadruhwvodc4sxs6oh57bzd3fhd2mcjsybaiy/"
              }
            />
          </Col>
          <Col flex="auto">
            <Meta title="Stani Kulechov" description="stani.lens" />
          </Col>
        </Row>
        <Row style={{ marginTop: "16px" }}>
          <Col span={24}>
            <div>
              <span>Building @LensProtocol & @AaveAave</span>
              <br />
            </div>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: "16px" }}>
          <Col span={8}>
            <div>
              <span>91821 Followers</span>
              <br />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <span>243 Following</span>
              <br />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <span>197 Posts</span>
              <br />
            </div>
          </Col>
        </Row>
        <Row style={{ marginTop: "16px" }}>
          <Col span={24}>
            <Button type="primary" style={{ backgroundColor: "#bf3989" }}>
              Sponsor
            </Button>
          </Col>
        </Row>
      </Card>
    </Col>
  );
};

export default function Home() {
  const [profiles, setProfiles] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchProfiles = async () => {
    setDataLoading(true);
    // update search filters based on type
    client
      .request(PROFILES_QUERY, {
        request: {
          limit: 10,
          handles: ["stani.lens"]
        }
      })
      .then((data) => {
        console.log("profiles: ", data.profiles.items);
        setProfiles(data.profiles.items);
        setDataLoading(false);
      })
      .catch((err) => {
        setDataLoading(false);
        message.error("Something went wrong. Is the Subgraph running?");
        console.error("failed to get profiles: ", err);
      });
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  return (
    <div className={styles.container}>
      <h1>Lenfluencer</h1>
      <Input.Search
        placeholder="Search by handle"
        size="large"
        value={""}
        enterButton
        allowClear
        onSearch={() => { }}
        onChange={(e) => { }}
      />
      <Row gutter={[16, 18]}>
        {
          // fill 4 cards
          [1, 2, 3, 4].map((i) => (
            <ProfileCard key={i} />
          ))
        }
      </Row>
    </div>
  );
}
