const LENS_MEDIA_SNAPSHOT_URL = "https://ik.imagekit.io/lens/media-snapshot";
export const ARWEAVE_GATEWAY = 'https://arweave.net/';
export const IPFS_GATEWAY = 'https://gateway.ipfscdn.io/ipfs/';
export const COVER = 'tr:w-1500,h-500';
export const STATIC_IMAGES_URL = "https://static-assets.lenster.xyz/images";
export const AVATAR = 'tr:w-300,h-300';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const imageKit = (url, name) => {
  if (!url) {
    return '';
  }

  if (url.includes(LENS_MEDIA_SNAPSHOT_URL)) {
    const splitedUrl = url.split('/');
    const path = splitedUrl[splitedUrl.length - 1];

    return name ? `${LENS_MEDIA_SNAPSHOT_URL}/${name}/${path}` : url;
  }

  return url;
};

/**
 * Returns the IPFS link for a given hash.
 *
 * @param hash The IPFS hash.
 * @returns The IPFS link.
 */
export const sanitizeDStorageUrl = (hash) => {
  if (!hash) {
    return '';
  }

  let link = hash.replace(/^Qm[1-9A-Za-z]{44}/gm, `${IPFS_GATEWAY}${hash}`);
  link = link.replace('https://ipfs.io/ipfs/', IPFS_GATEWAY);
  link = link.replace('ipfs://ipfs/', IPFS_GATEWAY);
  link = link.replace('ipfs://', IPFS_GATEWAY);
  link = link.replace('ar://', ARWEAVE_GATEWAY);

  return link;
};

/**
 * Returns the cdn.stamp.fyi URL for the specified Ethereum address.
 *
 * @param address The Ethereum address to get the URL for.
 * @returns The cdn.stamp.fyi URL.
 */
export const getStampFyiURL = (address) => {
  const lowerCaseAddress = address.toLowerCase();
  return `https://cdn.stamp.fyi/avatar/eth:${lowerCaseAddress}?s=300`;
};

/**
 * Returns the avatar image URL for a given profile.
 *
 * @param profile The profile object.
 * @param namedTransform The named transform to use.
 * @returns The avatar image URL.
 */
export const getAvatar = (profile, namedTransform = AVATAR) => {
  const avatarUrl =
    profile?.picture?.original?.url ??
    profile?.picture?.uri ??
    getStampFyiURL(profile?.ownedBy ?? ZERO_ADDRESS);

  return imageKit(sanitizeDStorageUrl(avatarUrl), namedTransform);
};