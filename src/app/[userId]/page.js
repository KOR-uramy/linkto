import UserPublicBoard from '../../components/UserPublicBoard';
import { listPublicSlugs } from '../../lib/db/user-repository';

export function generateStaticParams() {
  try {
    return listPublicSlugs().map((slug) => ({ userId: slug }));
  } catch {
    return [];
  }
}

export default async function UserPage({ params }) {
  const { userId } = await params;
  return <UserPublicBoard handle={userId} />;
}
