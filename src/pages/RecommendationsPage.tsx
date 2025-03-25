type Props = {
  initialResults: {
    bodyShape?: BodyShape;
    skinTone?: SkinTone;
  };
};

function RecommendationsPage({ initialResults }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    bodyShape: initialResults.bodyShape,
    skinTone: initialResults.skinTone
  });
}