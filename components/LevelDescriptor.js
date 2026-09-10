class LevelDescriptor extends Component {
  time = 10;
  unlockWalljump = false;
  unlockDash = false;

  from(data) {
    super.from(data);

    this.time = data.time;
    this.unlockWalljump = data.unlockWalljump;
    this.unlockDash = data.unlockDash;

    return this;
  }
}