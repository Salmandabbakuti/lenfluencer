"use client";
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { LensClient, development } from "@lens-protocol/client";

import { Card, Avatar, Row, Col, Button } from 'antd';

const { Meta } = Card;

const lensClient = new LensClient({
  environment: development
});

const ProfileCard = () => {
  return (
    <Card
      cover={<img src={"https://ik.imagekit.io/lens/media-snapshot/692020434413dd88dd96a93f9df08cfefd0a3b84abba5772c14a2f56ac01b0cd.jpg"} alt="Cover" />}
    >
      <Row gutter={16} align="middle">
        <Col>
          <Avatar size={80} src={"https://gateway.ipfscdn.io/ipfs/bafybeiehsyi2xtlfr7zmsuadruhwvodc4sxs6oh57bzd3fhd2mcjsybaiy/"} />
        </Col>
        <Col flex="auto">
          <Meta
            title="Stani Kulechov"
            description="stani.lens"
          />
        </Col>
      </Row>
      <Row style={{ marginTop: '16px' }}>
        <Col span={24}>
          <div>
            <span>Building @LensProtocol & @AaveAave</span>
            <br />
          </div>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: '16px' }}>
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
      <Row style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Button type="primary" style={{ backgroundColor: '#bf3989' }}>
            Sponsor
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default function Home() {
  const [profiles, setProfiles] = useState(null);

  useEffect(() => {
    lensClient.profile.fetchAll({
      limit: 10,
      profileIds: ["0x0635"]
    }).then((profiles) => {
      console.log(profiles);
      setProfiles(profiles);
    }).catch((err) => {
      console.log(err);
    });
  }, []);

  return (
    <div className={styles.container}>
      <h1>Next.js + Cloudflare Pages</h1>
      <ProfileCard />
      {/* <Profile
        handle='stani'
      /> */}
      <p>
        This is a sample project to demonstrate how to use Next.js on Cloudflare Pages.
      </p>
    </div>
  );
}
