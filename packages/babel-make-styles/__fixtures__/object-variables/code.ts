import { makeStyles } from '@fluentui/react-make-styles';
import { colorGreen, theme } from './vars';

const colorRed = 'red';

export const useStyles = makeStyles({
  root: { color: colorRed, paddingLeft: '4px' },
  icon: { color: theme.black, backgroundColor: colorGreen, marginLeft: '4px' },
});
