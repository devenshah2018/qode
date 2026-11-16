// One qubit, two possible outcomes. Step through H before measuring.
qubit coin;
bit result;
h coin;
inspect probabilities;
measure coin -> result;
