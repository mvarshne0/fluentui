import { makeStyles } from '@fluentui/react-make-styles';
// @ts-ignore
import color from 'non-existing-color-module';

const styles = makeStyles({
  root: theme => ({
    backgroundColor: color,
    color: theme.colorBrandStroke1,
  }),
});

console.log(styles);
