const sessionUseCounts = new Map();

export function shouldPromptForFeatureFeedback(userId, feature) {
  const key = `resident-feature-use:${userId}:${feature}`;
  let useCount = sessionUseCounts.get(key) || 0;

  try {
    const storedCount = Number.parseInt(localStorage.getItem(key), 10);
    if (Number.isInteger(storedCount) && storedCount >= 0) {
      useCount = storedCount;
    }
  } catch (error) {
    console.warn("Could not read saved feature-use count for feedback.", error);
  }

  useCount += 1;
  sessionUseCounts.set(key, useCount);

  try {
    localStorage.setItem(key, String(useCount));
  } catch (error) {
    console.warn("Could not save feature-use count for feedback.", error);
  }

  return useCount === 1 || (useCount - 1) % 7 === 0;
}
