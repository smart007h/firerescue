import React from 'react';
import { View, StyleSheet } from 'react-native';

const Pagination = ({ currentIndex, totalSlides }) => {
  return (
    <View style={styles.paginationContainer}>
      {Array(totalSlides).fill().map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            { backgroundColor: currentIndex === index ? '#FFF' : 'rgba(255, 255, 255, 0.5)' }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
    width: '100%',
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});

export default Pagination;
