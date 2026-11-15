import type {ImageSourcePropType} from 'react-native';
import type {Side, Kind} from './engine';
export const pieceImages: Record<Side, Record<Kind, ImageSourcePropType>> = {
  red: {
    king: require('../../assets/chess/pieces/red-king.png'),
    advisor: require('../../assets/chess/pieces/red-advisor.png'),
    elephant: require('../../assets/chess/pieces/red-elephant.png'),
    horse: require('../../assets/chess/pieces/red-horse.png'),
    rook: require('../../assets/chess/pieces/red-rook.png'),
    cannon: require('../../assets/chess/pieces/red-cannon.png'),
    pawn: require('../../assets/chess/pieces/red-pawn.png'),
  },
  black: {
    king: require('../../assets/chess/pieces/black-king.png'),
    advisor: require('../../assets/chess/pieces/black-advisor.png'),
    elephant: require('../../assets/chess/pieces/black-elephant.png'),
    horse: require('../../assets/chess/pieces/black-horse.png'),
    rook: require('../../assets/chess/pieces/black-rook.png'),
    cannon: require('../../assets/chess/pieces/black-cannon.png'),
    pawn: require('../../assets/chess/pieces/black-pawn.png'),
  },
};

export const boardImage = require('../../assets/chess/board.png');
export const tableImage = require('../../assets/chess/table.png');
