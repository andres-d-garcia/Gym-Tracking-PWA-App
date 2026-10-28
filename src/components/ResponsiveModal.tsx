import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
  BackHandler,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const baseHeightRef = useRef(windowHeight);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (keyboardHeight === 0 && windowHeight > 0) {
      baseHeightRef.current = Math.max(baseHeightRef.current, windowHeight);
    }
  }, [windowHeight, keyboardHeight]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      backSub.remove();
    };
  }, [visible, onClose]);

  if (!visible) return null;

  // Fallback clearance if Android 3-button nav bar is not reported in insets.bottom
  const screenHeight = Dimensions.get('screen').height;
  const navBarFallback =
    Platform.OS === 'android' && insets.bottom === 0
      ? Math.max(24, Math.min(56, screenHeight - windowHeight))
      : 0;

  // Detect if the OS already shrunk windowHeight when keyboard opened
  const heightShrink = Math.max(0, baseHeightRef.current - windowHeight);
  const effectiveKeyboardOffset =
    keyboardHeight > 0
      ? Math.max(0, keyboardHeight - heightShrink)
      : navBarFallback;

  const availableHeight = Math.max(
    220,
    windowHeight - insets.top - insets.bottom - effectiveKeyboardOffset - 12
  );

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      />

      <View
        style={[
          styles.sheetWrapper,
          {
            paddingBottom: effectiveKeyboardOffset,
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheetContainer,
            {
              maxHeight: availableHeight,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheetWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    width: '100%',
    maxWidth: 500,
    flexShrink: 1,
    overflow: 'hidden',
  },
});
