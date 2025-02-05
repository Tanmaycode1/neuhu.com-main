import { FollowButton } from '@/components/ui/follow-button';

export function UserSuggestion({ user, onFollowChange }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/profile/${user.username}`}>
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.username}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link 
          href={`/profile/${user.username}`}
          className="font-medium text-gray-900 dark:text-white hover:underline truncate block"
        >
          {user.username}
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`
            : user.email}
        </p>
      </div>
      <FollowButton 
        userId={user.id}
        onFollowChange={onFollowChange}
      />
    </div>
  );
} 