[Qode 1.0 smoke test: explicit declarations and readable commands]
qubit first;
qubit second;
h first;
y first;
x second;
h first;
i first;
y second;
print "Hello World";
inspect probabilities;
halt;
