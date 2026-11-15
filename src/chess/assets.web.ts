import type {ImageSourcePropType} from 'react-native';
import type {Side, Kind} from './engine';
import red_king from '../../assets/chess/pieces/red-king.png';
import red_advisor from '../../assets/chess/pieces/red-advisor.png';
import red_elephant from '../../assets/chess/pieces/red-elephant.png';
import red_horse from '../../assets/chess/pieces/red-horse.png';
import red_rook from '../../assets/chess/pieces/red-rook.png';
import red_cannon from '../../assets/chess/pieces/red-cannon.png';
import red_pawn from '../../assets/chess/pieces/red-pawn.png';
import black_king from '../../assets/chess/pieces/black-king.png';
import black_advisor from '../../assets/chess/pieces/black-advisor.png';
import black_elephant from '../../assets/chess/pieces/black-elephant.png';
import black_horse from '../../assets/chess/pieces/black-horse.png';
import black_rook from '../../assets/chess/pieces/black-rook.png';
import black_cannon from '../../assets/chess/pieces/black-cannon.png';
import black_pawn from '../../assets/chess/pieces/black-pawn.png';
import board from '../../assets/chess/board.png';
import table from '../../assets/chess/table.png';

export const boardImage = {uri: board};
export const tableImage = {uri: table};
export const pieceImages: Record<Side, Record<Kind, ImageSourcePropType>> = {
  red: {
    king: {uri: red_king},
    advisor: {uri: red_advisor},
    elephant: {uri: red_elephant},
    horse: {uri: red_horse},
    rook: {uri: red_rook},
    cannon: {uri: red_cannon},
    pawn: {uri: red_pawn},
  },
  black: {
    king: {uri: black_king},
    advisor: {uri: black_advisor},
    elephant: {uri: black_elephant},
    horse: {uri: black_horse},
    rook: {uri: black_rook},
    cannon: {uri: black_cannon},
    pawn: {uri: black_pawn},
  },
};
