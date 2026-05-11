/**
 * @file (onboarding)/index.tsx — first-launch carousel.
 * @module app
 *
 * 3 horizontal slides explaining what the app does. Skip and Get Started
 * both flip `onboardingStore.hasSeenOnboarding` to true and replace the
 * route to `/(auth)`. Returning users never see this screen — the root
 * dispatcher routes them straight past it.
 */
import { router } from 'expo-router';
import { Sparkles, Sprout, Tractor } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createLogger } from '@/lib/logger';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';

const log = createLogger('UI');

// Why: matches the md: Tailwind breakpoint we use elsewhere. Beyond this
// width, slide content (title + body) becomes hard to read because the eye
// has to track too far horizontally.
const SLIDE_MAX_WIDTH = 768;

const SLIDES = [
  {
    icon: Tractor,
    title: 'Rent farm machinery near you',
    body: 'Find tractors, harvesters, and tillers from owners in your district. Pay only for the hours you use.',
  },
  {
    icon: Sprout,
    title: 'Earn from machinery you own',
    body: 'List your tractor or implement and accept rental requests on your terms. We handle the schedule.',
  },
  {
    icon: Sparkles,
    title: 'AI-powered listings & pricing',
    body: 'Auto-suggest fair prices, generate listings, and answer renter questions in English or Kannada.',
  },
] as const;

export default function Onboarding() {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const markSeen = useOnboardingStore((s) => s.markSeen);

  // Why: useWindowDimensions is reactive — re-renders on browser resize so
  // the carousel stays correct on web. On native, returns stable device width
  // (no resize ever happens), so behavior is identical to the previous
  // module-level Dimensions snapshot.
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = Math.min(windowWidth, SLIDE_MAX_WIDTH);

  useEffect(() => {
    log.info('Onboarding: page visited');
  }, []);

  // Why: log every distinct slide the user lands on (including the first one).
  useEffect(() => {
    log.info('Onboarding: slide viewed', { page });
  }, [page]);

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      const nextPage = page + 1;
      log.info('Onboarding: continue tapped', { fromPage: page });
      // Why: setPage before scrollTo so state advances even if
      // onMomentumScrollEnd never fires (which happens on react-native-web
      // for programmatic scrolls). On native the event still fires, computes
      // the same newPage, and setPage(same value) is a React no-op — so this
      // change is web-only in effect, native behavior unchanged.
      setPage(nextPage);
      scrollRef.current?.scrollTo({
        x: slideWidth * nextPage,
        animated: true,
      });
      return;
    }
    log.info('Onboarding: get-started tapped');
    markSeen();
    log.info('Onboarding: completed', { via: 'get-started' });
    // Why: navigate to the explicit destination. Going to '/' is a no-op
    // when we're already at URL '/' (groups are invisible in the URL on web),
    // so the root dispatcher never re-runs. Direct group navigation works.
    router.replace('/(auth)');
  };

  const handleSkip = () => {
    log.info('Onboarding: skip tapped', { atPage: page });
    markSeen();
    log.info('Onboarding: completed', { via: 'skip' });
    router.replace('/(auth)');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg md:max-w-3xl md:mx-auto md:w-full">
      <View className="flex-row justify-end p-4">
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          className="px-4 py-2 min-h-[44px] justify-center"
        >
          <Text className="text-ink-soft text-base">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newPage = Math.round(
            e.nativeEvent.contentOffset.x / slideWidth
          );
          if (newPage !== page) log.info('Onboarding: slide swiped', { newPage });
          setPage(newPage);
        }}
        className="flex-1"
      >
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <View
              key={i}
              style={{ width: slideWidth }}
              className="items-center justify-center px-8"
            >
              <View className="bg-primary/10 rounded-full p-6 mb-8">
                <Icon size={64} color={colors.primary} />
              </View>
              <Text className="text-ink text-2xl font-semibold text-center mb-3">
                {slide.title}
              </Text>
              <Text className="text-ink-soft text-base text-center leading-6">
                {slide.body}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row justify-center mb-6">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className={`w-2 h-2 rounded-full mx-1 ${
              page === i ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </View>

      <View className="px-6 pb-6">
        <Pressable
          onPress={handleNext}
          className="bg-primary rounded-xl py-4 items-center min-h-[44px] justify-center"
        >
          <Text className="text-white text-base font-semibold">
            {page === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
